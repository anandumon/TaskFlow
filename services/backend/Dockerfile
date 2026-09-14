# =============================================================================
# Stage 1: Build JAR using Gradle & Eclipse Temurin JDK 21
# =============================================================================
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy gradle wrapper and definition files first for layer caching
COPY gradlew ./
COPY gradle ./gradle
COPY build.gradle settings.gradle ./

RUN chmod +x ./gradlew
RUN ./gradlew dependencies --no-daemon || true

# Copy source code and build bootJar
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# =============================================================================
# Stage 2: Minimal JRE Runtime
# =============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Run as non-root user
RUN addgroup -S taskflow && adduser -S taskflow -G taskflow
USER taskflow

# Copy the built jar from builder stage
COPY --from=builder /app/build/libs/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-Xmx400m", "-jar", "app.jar"]
