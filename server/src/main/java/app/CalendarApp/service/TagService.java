package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;

import java.util.List;

/**
 * Service contract for managing reusable tags owned by an account.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface TagService {
    /**
     * Lists all tags owned by an account.
     *
     * @param owner account owner
     * @return owned tags, or an empty list when owner is null
     */
    List<Tag> findAllByOwner(Account owner);

    /**
     * Finds a tag by owner and case-insensitive name.
     *
     * @param owner account owner
     * @param tagName tag name to search for
     * @return matching tag or null
     */
    Tag findTagByOwnerAndName(Account owner, String tagName);

    /**
     * Creates a tag or returns an existing matching tag.
     *
     * @param owner account owner
     * @param tagName tag display name
     * @return created or existing tag
     */
    Tag createTag(Account owner, String tagName);

    /**
     * Resolves incoming tag references to persisted tag documents.
     *
     * @param owner account owner
     * @param tags incoming tags from a task payload
     * @return persisted tag list
     */
    List<Tag> ensureTagsExist(Account owner, List<Tag> tags);
}
