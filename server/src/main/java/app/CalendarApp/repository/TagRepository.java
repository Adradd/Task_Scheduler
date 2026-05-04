package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Mongo repository for user-owned tags.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface TagRepository extends MongoRepository<Tag, String>{
    List<Tag> findAllByOwner(Account owner);
    Tag findTagByTagName(String tagName);
    Tag findTagByOwnerAndTagNameIgnoreCase(Account owner, String tagName);
    void deleteAllByOwner(Account owner);
}
