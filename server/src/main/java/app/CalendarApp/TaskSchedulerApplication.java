package app.CalendarApp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Task Scheduler Spring Boot application.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@SpringBootApplication
public class TaskSchedulerApplication {
    /**
     * Starts the embedded Spring application context.
     *
     * @param args command-line arguments passed to Spring Boot
     */
    public static void main(String[] args) {
        SpringApplication.run(TaskSchedulerApplication.class, args);
    }
}
