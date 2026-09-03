package com.taskflow.identity.repository;

import com.taskflow.identity.entity.EmailVerificationOtp;
import com.taskflow.identity.entity.OtpStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EmailVerificationOtpRepository extends JpaRepository<EmailVerificationOtp, UUID> {

    @Query("SELECT o FROM EmailVerificationOtp o WHERE o.userId = :userId AND o.status = com.taskflow.identity.entity.OtpStatus.ACTIVE AND o.deleted = false")
    Optional<EmailVerificationOtp> findActiveByUserId(@Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM EmailVerificationOtp o WHERE o.userId = :userId AND o.status = com.taskflow.identity.entity.OtpStatus.ACTIVE AND o.deleted = false")
    Optional<EmailVerificationOtp> findActiveByUserIdWithLock(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE EmailVerificationOtp o SET o.status = com.taskflow.identity.entity.OtpStatus.REPLACED, o.updatedAt = :now WHERE o.userId = :userId AND o.status = com.taskflow.identity.entity.OtpStatus.ACTIVE AND o.deleted = false")
    void invalidateActiveOtpsForUser(@Param("userId") UUID userId, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE EmailVerificationOtp o SET o.status = com.taskflow.identity.entity.OtpStatus.EXPIRED, o.updatedAt = :now WHERE o.status = com.taskflow.identity.entity.OtpStatus.ACTIVE AND o.expiresAt < :now AND o.deleted = false")
    int markExpiredOtps(@Param("now") Instant now);

    @Query("SELECT o FROM EmailVerificationOtp o WHERE o.userId = :userId AND o.createdAt >= :since AND o.deleted = false")
    List<EmailVerificationOtp> findOtpsSinceForUser(@Param("userId") UUID userId, @Param("since") Instant since);

    @Modifying
    @Query("DELETE FROM EmailVerificationOtp o WHERE o.createdAt < :cutoff AND o.status IN (com.taskflow.identity.entity.OtpStatus.VERIFIED, com.taskflow.identity.entity.OtpStatus.EXPIRED, com.taskflow.identity.entity.OtpStatus.MAX_ATTEMPTS_EXCEEDED, com.taskflow.identity.entity.OtpStatus.REPLACED)")
    int deleteOldOtps(@Param("cutoff") Instant cutoff);
}
