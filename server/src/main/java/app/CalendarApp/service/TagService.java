package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;

import java.util.List;

public interface TagService {
    List<Tag> findAllByOwner(Account owner);
    Tag findTagByOwnerAndName(Account owner, String tagName);
    Tag createTag(Account owner, String tagName);
    List<Tag> ensureTagsExist(Account owner, List<Tag> tags);
}
