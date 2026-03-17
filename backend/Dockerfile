# Build stage
FROM gradle:8.7-jdk17-alpine AS builder
WORKDIR /workspace
COPY . .
RUN gradle bootJar --no-daemon

# Runtime stage
FROM eclipse-temurin:17-jre
WORKDIR /
ARG GMS_API_KEY
ENV GMS_API_KEY=${GMS_API_KEY}
COPY --from=builder /workspace/build/libs/*.jar /app.jar
ENTRYPOINT ["java","-Duser.timezone=Asia/Seoul","-jar","/app.jar"]
