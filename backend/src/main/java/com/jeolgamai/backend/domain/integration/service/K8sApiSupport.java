package com.jeolgamai.backend.domain.integration.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.net.ssl.SSLContext;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.SecureRandom;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Collection;
import java.util.Locale;

import javax.net.ssl.SSLHandshakeException;
import javax.net.ssl.TrustManagerFactory;

@Service
public class K8sApiSupport {

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);

    private final boolean allowLoopback;

    public K8sApiSupport(@Value("${connector.allow-loopback:false}") boolean allowLoopback) {
        this.allowLoopback = allowLoopback;
    }

    public String normalizeApiServerUrl(String rawUrl) {
        String trimmed = rawUrl == null ? "" : rawUrl.trim();
        if (trimmed.isBlank()) {
            throw new IllegalArgumentException("apiServerUrl은 비어 있을 수 없습니다.");
        }

        URI uri;
        try {
            uri = new URI(trimmed);
        } catch (URISyntaxException exception) {
            throw new IllegalArgumentException("apiServerUrl 형식이 올바르지 않습니다.");
        }

        String scheme = uri.getScheme();
        if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
            throw new IllegalArgumentException("apiServerUrl은 http 또는 https만 허용합니다.");
        }

        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("apiServerUrl host를 확인할 수 없습니다.");
        }

        if (!allowLoopback && isBlockedHost(host)) {
            throw new IllegalArgumentException("보안상 loopback 또는 metadata endpoint는 허용되지 않습니다.");
        }

        return trimmed.replaceAll("/+$", "");
    }

    public String normalizeBearerToken(String rawToken) {
        String token = rawToken == null ? "" : rawToken.trim();
        if (token.isBlank()) {
            throw new IllegalArgumentException("token은 비어 있을 수 없습니다.");
        }
        if (token.regionMatches(true, 0, "Bearer ", 0, 7)) {
            token = token.substring(7).trim();
        }
        if (token.isBlank()) {
            throw new IllegalArgumentException("Bearer token 값이 비어 있습니다.");
        }
        return token;
    }

    public HttpClient buildHttpClient(String caCertPem) {
        HttpClient.Builder builder = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.NEVER);

        String normalizedCa = trimToNull(caCertPem);
        if (normalizedCa != null) {
            builder.sslContext(buildSslContext(normalizedCa));
        }

        return builder.build();
    }

    public String describeHttpStatus(String path, int statusCode) {
        if (statusCode == HttpURLConnection.HTTP_UNAUTHORIZED) {
            return path + " 인증 실패(401)입니다. Bearer 토큰 또는 토큰 만료 여부를 확인하세요.";
        }
        if (statusCode == HttpURLConnection.HTTP_FORBIDDEN) {
            return path + " 권한 부족(403)입니다. ClusterRole/RoleBinding RBAC를 확인하세요.";
        }
        return path + " 응답코드 " + statusCode;
    }

    public String describeConnectionFailure(IOException exception) {
        Throwable rootCause = rootCause(exception);
        String combinedMessage = exception.toString() + " " + rootCause;
        if (containsIgnoreCase(combinedMessage, "No subject alternative names")
                || containsIgnoreCase(combinedMessage, "No name matching")
                || containsIgnoreCase(combinedMessage, "subject alternative names")) {
            return "Kubernetes API 인증서의 호스트명과 입력한 URL이 일치하지 않습니다. IP 대신 kubeconfig의 server DNS endpoint를 사용하세요.";
        }
        if (rootCause instanceof SSLHandshakeException
                || containsIgnoreCase(combinedMessage, "PKIX")
                || containsIgnoreCase(combinedMessage, "unable to find valid certification path")
                || containsIgnoreCase(combinedMessage, "certificate_unknown")) {
            return "TLS 인증서 검증에 실패했습니다. 사설 CA를 사용한다면 Kubernetes CA 인증서를 함께 입력하세요.";
        }
        if (rootCause instanceof UnknownHostException) {
            return "Kubernetes API host를 해석할 수 없습니다.";
        }
        if (rootCause instanceof ConnectException) {
            return "Kubernetes API endpoint에 연결할 수 없습니다.";
        }
        if (rootCause instanceof HttpTimeoutException) {
            return "Kubernetes API 요청이 시간 초과되었습니다.";
        }
        return trimToNull(rootCause.getMessage()) == null
                ? "Kubernetes API 호출에 실패했습니다."
                : rootCause.getMessage().trim();
    }

    private SSLContext buildSslContext(String caCertPem) {
        try {
            CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
            Collection<? extends Certificate> certificates = certificateFactory.generateCertificates(certificateInputStream(caCertPem));
            if (certificates.isEmpty()) {
                throw new IllegalArgumentException("caCertPem에 유효한 X.509 인증서가 없습니다.");
            }

            KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
            keyStore.load(null, null);
            int index = 0;
            for (Certificate certificate : certificates) {
                keyStore.setCertificateEntry("k8s-ca-" + index, certificate);
                index += 1;
            }

            TrustManagerFactory trustManagerFactory = TrustManagerFactory.getInstance(
                    TrustManagerFactory.getDefaultAlgorithm()
            );
            trustManagerFactory.init(keyStore);

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(null, trustManagerFactory.getTrustManagers(), new SecureRandom());
            return sslContext;
        } catch (GeneralSecurityException | IOException exception) {
            throw new IllegalArgumentException("caCertPem 처리에 실패했습니다. PEM 형식을 확인하세요.");
        }
    }

    private ByteArrayInputStream certificateInputStream(String caCertPem) {
        String trimmed = caCertPem.trim();
        if (trimmed.contains("-----BEGIN CERTIFICATE-----")) {
            return new ByteArrayInputStream(trimmed.getBytes(StandardCharsets.UTF_8));
        }

        String normalized = trimmed
                .replaceAll("(?m)^certificate-authority-data:\\s*", "")
                .replaceAll("\\s+", "");
        try {
            return new ByteArrayInputStream(Base64.getDecoder().decode(normalized));
        } catch (IllegalArgumentException exception) {
            return new ByteArrayInputStream(trimmed.getBytes(StandardCharsets.UTF_8));
        }
    }

    private boolean isBlockedHost(String host) {
        String normalized = host.toLowerCase(Locale.ROOT);
        return normalized.equals("localhost")
                || normalized.equals("0.0.0.0")
                || normalized.equals("::1")
                || normalized.startsWith("127.")
                || normalized.equals("169.254.169.254")
                || normalized.equals("169.254.170.2");
    }

    private boolean containsIgnoreCase(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle.toLowerCase(Locale.ROOT));
    }

    private Throwable rootCause(Throwable throwable) {
        Throwable current = throwable;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
