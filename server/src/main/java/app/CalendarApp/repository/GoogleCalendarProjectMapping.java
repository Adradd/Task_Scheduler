package app.CalendarApp.repository;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

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

