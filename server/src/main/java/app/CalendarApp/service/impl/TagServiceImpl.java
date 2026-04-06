package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.TagRepository;
import app.CalendarApp.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class TagServiceImpl implements TagService {
    private final TagRepository tagRepository;

    @Autowired
    public TagServiceImpl(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Override
    public List<Tag> findAllByOwner(Account owner) {
        if (owner == null) {
            return new ArrayList<>();
        }
        return tagRepository.findAllByOwner(owner);
    }

    @Override
    public Tag findTagByOwnerAndName(Account owner, String tagName) {
        validateTag(owner, tagName);
        return tagRepository.findTagByOwnerAndTagNameIgnoreCase(owner, tagName.trim());
    }

    @Override
    public Tag createTag(Account owner, String tagName) {
        validateTag(owner, tagName);

        String normalizedName = tagName.trim();
        Tag existing = tagRepository.findTagByOwnerAndTagNameIgnoreCase(owner, normalizedName);
        if (existing != null) {
            return existing;
        }

        Tag tag = new Tag();
        tag.setOwner(owner);
        tag.setTagName(normalizedName);
        return tagRepository.save(tag);
    }

    @Override
    public List<Tag> ensureTagsExist(Account owner, List<Tag> tags) {
        if (owner == null || tags == null || tags.isEmpty()) {
            return new ArrayList<>();
        }

        List<Tag> resolvedTags = new ArrayList<>();
        for (Tag tag : tags) {
            if (tag == null || tag.getTagName() == null || tag.getTagName().trim().isEmpty()) {
                continue;
            }
            String tagName = tag.getTagName().trim();
            // Find existing tag or create it if it doesn't exist
            Tag resolvedTag = findTagByOwnerAndName(owner, tagName);
            if (resolvedTag == null) {
                // Tag doesn't exist, create it
                resolvedTag = createTag(owner, tagName);
            }
            if (resolvedTag != null) {
                resolvedTags.add(resolvedTag);
            }
        }

        return resolvedTags;
    }

    private void validateTag(Account owner, String tagName) {
        if (owner == null) {
            throw new IllegalArgumentException("Owner is required");
        }
        if (tagName == null || tagName.trim().isEmpty()) {
            throw new IllegalArgumentException("Tag name is required");
        }
    }
}
