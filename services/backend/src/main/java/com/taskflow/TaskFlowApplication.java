package com.taskflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableAsync
@EnableScheduling
public class TaskFlowApplication {

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(TaskFlowApplication.class, args);
    }

    private static void loadDotEnv() {
        String[] candidates = {
            ".env",
            "services/backend/.env",
            "../services/backend/.env"
        };
        for (String candidate : candidates) {
            java.io.File file = new java.io.File(candidate);
            if (file.exists() && file.isFile()) {
                try {
                    java.util.List<String> lines = java.nio.file.Files.readAllLines(file.toPath());
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) continue;
                        int idx = line.indexOf('=');
                        if (idx > 0) {
                            String key = line.substring(0, idx).trim();
                            String val = line.substring(idx + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                if (val.length() >= 2) val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null) {
                                System.setProperty(key, val);
                            }
                            if ("MAIL_USERNAME".equals(key)) {
                                System.setProperty("spring.mail.username", val);
                            } else if ("MAIL_PASSWORD".equals(key)) {
                                System.setProperty("spring.mail.password", val);
                            } else if ("SPRING_PROFILES_ACTIVE".equals(key)) {
                                System.setProperty("spring.profiles.active", val);
                            }
                        }
                    }
                    System.out.println("Loaded .env from: " + file.getAbsolutePath());
                    break;
                } catch (Exception e) {
                    System.err.println("Failed to read .env from " + candidate + ": " + e.getMessage());
                }
            }
        }
    }
}
