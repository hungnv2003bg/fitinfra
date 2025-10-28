package com.foxconn.sopchecklist;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SopChecklistApplication {

    public static void main(String[] args) {
        SpringApplication.run(SopChecklistApplication.class, args);
    }
}



