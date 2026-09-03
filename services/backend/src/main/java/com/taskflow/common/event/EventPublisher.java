package com.taskflow.common.event;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class EventPublisher {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public EventPublisher(@Autowired(required = false) KafkaTemplate<String, Object> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(String topic, DomainEvent event) {
        log.debug("Publishing event [{}] to topic [{}]", event.getEventType(), topic);
        if (kafkaTemplate != null) {
            kafkaTemplate.send(topic, event.getEventId().toString(), event)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Failed to publish event [{}] to topic [{}]",
                                    event.getEventType(), topic, ex);
                        } else {
                            log.debug("Event [{}] published to topic [{}] partition [{}] offset [{}]",
                                    event.getEventType(), topic,
                                    result.getRecordMetadata().partition(),
                                    result.getRecordMetadata().offset());
                        }
                    });
        } else {
            log.info("KafkaTemplate not configured; logged domain event [{}] locally.", event.getEventType());
        }
    }

    public static final class Topics {
        public static final String USER_EVENTS = "user.events";
        public static final String ORG_EVENTS = "org.events";
        public static final String WORKSPACE_EVENTS = "workspace.events";
        public static final String AUTH_EVENTS = "auth.events";
        public static final String AUDIT_EVENTS = "audit.events";

        private Topics() {}
    }
}
