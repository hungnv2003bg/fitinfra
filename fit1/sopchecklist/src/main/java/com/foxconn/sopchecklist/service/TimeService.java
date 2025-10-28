package com.foxconn.sopchecklist.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

@Service
public class TimeService {

    private final JdbcTemplate jdbcTemplate;
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public TimeService(@Qualifier("mainJdbcTemplate") JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public LocalDateTime nowUtc() {
        try {
            return jdbcTemplate.queryForObject("SELECT SYSUTCDATETIME()", (rs, rowNum) -> rs.getObject(1, LocalDateTime.class));
        } catch (Exception e) {
            return LocalDateTime.now();
        }
    }


    public LocalDateTime nowVietnam() {
        try {
            LocalDateTime utcTime = jdbcTemplate.queryForObject("SELECT SYSUTCDATETIME()", (rs, rowNum) -> rs.getObject(1, LocalDateTime.class));
            if (utcTime != null) {
                return utcTime.atZone(ZoneId.of("UTC")).withZoneSameInstant(VIETNAM_ZONE).toLocalDateTime();
            }
        } catch (Exception e) {
        }
        return ZonedDateTime.now(VIETNAM_ZONE).toLocalDateTime();
    }
}




