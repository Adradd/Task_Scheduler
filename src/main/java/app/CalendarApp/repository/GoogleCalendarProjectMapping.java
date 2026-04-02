package app.CalendarApp.repository;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("GoogleCalendarProjectMapping")
public class GoogleCalendarProjectMapping {
    @Id
    private String id;
    private String accountId;
    private String googleCalendarId;
    private String googleCalendarName;
    private String projectId;
    private boolean enabled;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public String getGoogleCalendarId() {
        return googleCalendarId;
    }

    public void setGoogleCalendarId(String googleCalendarId) {
        this.googleCalendarId = googleCalendarId;
    }

    public String getGoogleCalendarName() {
        return googleCalendarName;
    }

    public void setGoogleCalendarName(String googleCalendarName) {
        this.googleCalendarName = googleCalendarName;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}

