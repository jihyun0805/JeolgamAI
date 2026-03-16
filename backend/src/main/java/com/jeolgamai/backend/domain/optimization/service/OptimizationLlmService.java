package com.jeolgamai.backend.domain.optimization.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class OptimizationLlmService {

    private static final Logger log = LoggerFactory.getLogger(OptimizationLlmService.class);

    private final ObjectProvider<ChatModel> chatModelProvider;
    private final boolean llmEnabled;

    public OptimizationLlmService(
            ObjectProvider<ChatModel> chatModelProvider,
            @Value("${optimization.ai.llm-enabled:true}") boolean llmEnabled
    ) {
        this.chatModelProvider = chatModelProvider;
        this.llmEnabled = llmEnabled;
    }

    public Optional<String> complete(
            String workspaceId,
            String analysisId,
            String systemPrompt,
            String userPrompt
    ) {
        if (!llmEnabled) {
            return Optional.empty();
        }

        ChatModel chatModel = chatModelProvider.getIfAvailable();
        if (chatModel == null) {
            return Optional.empty();
        }

        try {
            String content = ChatClient.create(chatModel)
                    .prompt()
                    .system(systemPrompt)
                    .user(userPrompt)
                    .call()
                    .content();

            if (content == null || content.isBlank()) {
                return Optional.empty();
            }
            return Optional.of(content.trim());
        } catch (RuntimeException exception) {
            log.warn(
                    "LLM 응답 생성 실패. workspaceId={}, analysisId={}, message={}",
                    workspaceId,
                    analysisId,
                    exception.getMessage()
            );
            return Optional.empty();
        }
    }
}
