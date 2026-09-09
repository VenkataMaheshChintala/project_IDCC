package com.codearena.judge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class JudgeWorkerApplication {
    public static void main(String[] args) {
        SpringApplication.run(JudgeWorkerApplication.class, args);
    }
}
