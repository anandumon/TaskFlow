package com.taskflow.identity.service;

import com.taskflow.identity.repository.EmailVerificationOtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpCleanupScheduler {

    private final EmailVerificationOtpRepository otpRepository;

    /**
     * Runs every 15 minutes to transition expired active OTPs to EXPIRED status.
     */
    @Scheduled(fixedRate = 900_000, initialDelay = 60_000)
    @Transactional
    public void markExpiredOtps() {
        try {
            int updated = otpRepository.markExpiredOtps(Instant.now());
            if (updated > 0) {
                log.info("🧹 [OTP CLEANUP] Automatically expired {} outdated active OTP records.", updated);
            }
        } catch (Exception e) {
            log.warn("Error during scheduled OTP expiration check: {}", e.getMessage());
        }
    }

    /**
     * Runs once daily at midnight to purge old inactive OTP audit records older than 30 days.
     */
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void purgeOldOtps() {
        try {
            Instant cutoff = Instant.now().minus(Duration.ofDays(30));
            int deleted = otpRepository.deleteOldOtps(cutoff);
            if (deleted > 0) {
                log.info("🧹 [OTP CLEANUP] Purged {} inactive historical OTP records older than 30 days.", deleted);
            }
        } catch (Exception e) {
            log.warn("Error during historical OTP record purge: {}", e.getMessage());
        }
    }
}
