package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface TagRepository extends MongoRepository<Tag, String>{
    List<Tag> findAllByOwner(Account owner);
    Tag findTagByTagName(String tagName);
}
