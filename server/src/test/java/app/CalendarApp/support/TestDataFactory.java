package app.CalendarApp.support;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMapping;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;

import java.util.List;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static Account account(String id, String username) {
        Account account = new Account(id, username, "encoded-password", username + "@example.com", null, "09:00", "17:00");
        account.setRole("user");
        return account;
    }

    public static Project project(String id, Account owner, String name) {
        Project project = new Project();
        project.setProjectId(id);
        project.setOwner(owner);
        project.setProjectName(name);
        project.setProjectColor("#3fb0ba");
        return project;
    }

    public static Tag tag(String id, Account owner, String name) {
        Tag tag = new Tag();
        tag.setTagId(id);
        tag.setOwner(owner);
        tag.setTagName(name);
        return tag;
    }

    public static Task task(String id, Account owner, String name) {
        Task task = new Task();
        task.setTaskId(id);
        task.setOwner(owner);
        task.setTaskName(name);
        task.setDeadline("2026-04-10");
        task.setTimeToComplete("1h");
        task.setPriority("high");
        task.setTags(List.of());
        return task;
    }

    public static GoogleCalendarProjectMapping mapping(String accountId, String calendarId, boolean enabled) {
        GoogleCalendarProjectMapping mapping = new GoogleCalendarProjectMapping();
        mapping.setAccountId(accountId);
        mapping.setGoogleCalendarId(calendarId);
        mapping.setGoogleCalendarName(calendarId + " name");
        mapping.setEnabled(enabled);
        return mapping;
    }
}
