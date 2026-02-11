package com.usa.attendancesystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AttendancesystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(AttendancesystemApplication.class, args);
	}

}
