package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface GoogleCalendarProjectMappingRepository extends MongoRepository<GoogleCalendarProjectMapping, String> {
    List<GoogleCalendarProjectMapping> findAllByAccountId(String accountId);
    GoogleCalendarProjectMapping findByAccountIdAndGoogleCalendarId(String accountId, String googleCalendarId);
    void deleteAllByAccountId(String accountId);
}

