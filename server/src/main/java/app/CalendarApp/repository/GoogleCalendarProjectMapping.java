package app.CalendarApp.repository;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

/**
 * MongoDB document linking a Google Calendar calendar to an optional project
 * and enabled state for a specific account.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@Setter
@Getter
@Document("GoogleCalendarProjectMapping")
public class GoogleCalendarProjectMapping {
    @Id
    private String id;
    private String accountId;
    private String googleCalendarId;
    private String googleCalendarName;
    private String projectId;
    private boolean enabled;
}
