package com.foxconn.sopchecklist.config;

import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;
import java.time.ZoneId;
import java.util.TimeZone;

@Configuration
public class TimezoneConfig {

    @PostConstruct
    public void init() {

        TimeZone.setDefault(TimeZone.getTimeZone(ZoneId.of("Asia/Ho_Chi_Minh")));
        System.setProperty("user.timezone", "Asia/Ho_Chi_Minh");
    }
}

