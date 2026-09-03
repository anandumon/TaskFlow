package com.taskflow.common.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
public class RedisConfig {

    @Bean
    @ConditionalOnBean(RedisConnectionFactory.class)
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }

    public static final class CacheKeys {
        public static final String USER_PREFIX = "user:";
        public static final String PERMISSIONS_PREFIX = "permissions:";
        public static final String EMAIL_VERIFY_PREFIX = "email-verify:";
        public static final String PASSWORD_RESET_PREFIX = "password-reset:";
        public static final String RATE_LIMIT_PREFIX = "rate-limit:";

        public static final Duration EMAIL_VERIFY_TTL = Duration.ofHours(24);
        public static final Duration PASSWORD_RESET_TTL = Duration.ofHours(1);
        public static final Duration RATE_LIMIT_WINDOW = Duration.ofMinutes(15);

        private CacheKeys() {}
    }
}
