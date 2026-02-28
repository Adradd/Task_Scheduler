package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.TagRepository;
import app.CalendarApp.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TagServiceImpl implements TagService {
    private final TagRepository tagRepository;

    @Autowired
    public TagServiceImpl(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Override
    public List<Tag> findAllByOwner(Account owner) {
        return tagRepository.findAllByOwner(owner);
    }

    @Override
    public String createTag(String tag) {
        return "";
    }

    private void validateTag(Tag tag) {
        //TODO: check if tag has already been created

    }
}
