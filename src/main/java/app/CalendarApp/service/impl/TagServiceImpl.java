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
    public List<String> ensureTagsExist(Account owner, List<String> tags) {
        if (owner == null || tags == null || tags.isEmpty()) {
            return new ArrayList<>();
        }

        Set<String> normalized = new LinkedHashSet<>();
        for (String rawTag : tags) {
            if (rawTag == null) {
                continue;
            }
            String value = rawTag.trim();
            if (value.isEmpty()) {
                continue;
            }
            createTag(owner, value);
            normalized.add(value);
        }

        return new ArrayList<>(normalized);
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
