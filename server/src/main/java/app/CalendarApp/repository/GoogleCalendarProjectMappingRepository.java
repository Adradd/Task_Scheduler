package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Mongo repository for Google Calendar mapping records scoped by account and
 * calendar identifiers.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface GoogleCalendarProjectMappingRepository extends MongoRepository<GoogleCalendarProjectMapping, String> {
    List<GoogleCalendarProjectMapping> findAllByAccountId(String accountId);
    GoogleCalendarProjectMapping findByAccountIdAndGoogleCalendarId(String accountId, String googleCalendarId);
    void deleteAllByAccountId(String accountId);
}
