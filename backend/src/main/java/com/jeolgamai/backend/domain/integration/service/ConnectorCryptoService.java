package com.jeolgamai.backend.domain.integration.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

@Service
public class ConnectorCryptoService {

    private static final Logger log = LoggerFactory.getLogger(ConnectorCryptoService.class);
    private static final int GCM_TAG_LENGTH = 128;
    private static final int IV_LENGTH = 12;

    private final String configuredSecret;
    private final String datasourcePassword;
    private final SecureRandom secureRandom = new SecureRandom();

    private SecretKeySpec secretKeySpec;

    public ConnectorCryptoService(
            @Value("${connector.encryption-key:}") String configuredSecret,
            @Value("${spring.datasource.password:}") String datasourcePassword
    ) {
        this.configuredSecret = configuredSecret;
        this.datasourcePassword = datasourcePassword;
    }

    @PostConstruct
    void initialize() {
        String seed = hasText(configuredSecret) ? configuredSecret : datasourcePassword;
        if (!hasText(seed)) {
            throw new IllegalStateException("connector encryption seed를 찾을 수 없습니다.");
        }

        if (!hasText(configuredSecret)) {
            log.warn("CONNECTOR_ENCRYPTION_KEY가 없어 datasource password 기반 암호화를 사용합니다.");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] key = digest.digest((seed + ":integration-connectors").getBytes(StandardCharsets.UTF_8));
            this.secretKeySpec = new SecretKeySpec(key, "AES");
        } catch (Exception exception) {
            throw new IllegalStateException("connector 암호화 키를 초기화하지 못했습니다.", exception);
        }
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            byte[] payload = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(ciphertext, 0, payload, iv.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("connector 정보를 암호화하지 못했습니다.", exception);
        }
    }

    public String decrypt(String encryptedPayload) {
        try {
            byte[] payload = Base64.getDecoder().decode(encryptedPayload);
            if (payload.length <= IV_LENGTH) {
                throw new IllegalArgumentException("암호화 payload가 유효하지 않습니다.");
            }

            byte[] iv = Arrays.copyOfRange(payload, 0, IV_LENGTH);
            byte[] ciphertext = Arrays.copyOfRange(payload, IV_LENGTH, payload.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, secretKeySpec, new GCMParameterSpec(GCM_TAG_LENGTH, iv));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("connector 정보를 복호화하지 못했습니다.", exception);
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
