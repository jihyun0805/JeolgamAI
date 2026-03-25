package com.jeolgamai.backend.domain.project.service;

import com.jeolgamai.backend.domain.project.dto.CreateProjectRequest;
import com.jeolgamai.backend.domain.project.dto.ProjectResponse;
import com.jeolgamai.backend.domain.project.entity.ProjectRecord;
import com.jeolgamai.backend.domain.project.repository.ProjectRecordRepository;
import com.jeolgamai.backend.domain.user.entity.UserAccount;
import com.jeolgamai.backend.domain.user.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private static final String DEFAULT_REGION = "ap-northeast-2";
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final ProjectRecordRepository projectRecordRepository;
    private final UserAccountRepository userAccountRepository;

    @Transactional
    public List<ProjectResponse> listProjects(Long userId) {
        UserAccount user = getUser(userId);
        ensureDefaultProject(user);
        return projectRecordRepository.findByOwnerUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ProjectResponse createProject(Long userId, CreateProjectRequest request) {
        UserAccount user = getUser(userId);
        String name = normalizeProjectName(request.getName());
        String awsRegion = normalizeRegion(request.getAwsRegion());

        ProjectRecord saved = projectRecordRepository.saveAndFlush(
                new ProjectRecord(
                        createProjectId(userId),
                        user.getId(),
                        name,
                        awsRegion
                )
        );
        return toResponse(saved);
    }

    @Transactional
    public ProjectResponse ensureDefaultProject(Long userId) {
        UserAccount user = getUser(userId);
        return toResponse(ensureDefaultProject(user));
    }

    private ProjectRecord ensureDefaultProject(UserAccount user) {
        return projectRecordRepository.findByOwnerUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .findFirst()
                .orElseGet(() -> projectRecordRepository.save(
                        new ProjectRecord(
                                createProjectId(user.getId()),
                                user.getId(),
                                user.getName() + " 서울 비용 프로젝트",
                                DEFAULT_REGION
                        )
                ));
    }

    private UserAccount getUser(Long userId) {
        return userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private String normalizeProjectName(String rawName) {
        if (!StringUtils.hasText(rawName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로젝트 이름은 필수입니다.");
        }
        String trimmed = rawName.trim();
        if (trimmed.length() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "프로젝트 이름은 2자 이상이어야 합니다.");
        }
        return trimmed;
    }

    private String normalizeRegion(String rawRegion) {
        if (!StringUtils.hasText(rawRegion)) {
            return DEFAULT_REGION;
        }
        String trimmed = rawRegion.trim();
        if (trimmed.length() > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "AWS 리전 형식이 올바르지 않습니다.");
        }
        return trimmed;
    }

    private String createProjectId(Long userId) {
        String random = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return "proj_user" + userId + "_" + random.toLowerCase(Locale.ROOT);
    }

    private ProjectResponse toResponse(ProjectRecord record) {
        return new ProjectResponse(
                record.getId(),
                record.getName(),
                String.valueOf(record.getOwnerUserId()),
                record.getAwsRegion(),
                record.getCreatedAt() == null ? null : record.getCreatedAt().format(ISO)
        );
    }
}
