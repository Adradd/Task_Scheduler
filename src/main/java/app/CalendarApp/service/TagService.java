package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;

import java.util.List;

public interface TagService {
    List<Tag> findAllByOwner(Account owner);
    String createTag(String tag);
}
