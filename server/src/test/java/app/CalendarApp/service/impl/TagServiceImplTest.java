package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.TagRepository;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TagServiceImplTest {

    @Mock
    private TagRepository tagRepository;

    @InjectMocks
    private TagServiceImpl tagService;

    private Account owner;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
    }

    @Test
    void findAllByOwnerReturnsEmptyListForNullOwner() {
        assertEquals(List.of(), tagService.findAllByOwner(null));
    }

    @Test
    void createTagTrimsNameAndSaves() {
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Tag created = tagService.createTag(owner, "  urgent  ");

        assertEquals("urgent", created.getTagName());
        assertSame(owner, created.getOwner());
    }

    @Test
    void createTagReturnsExistingTag() {
        Tag existing = TestDataFactory.tag("tag-1", owner, "urgent");
        when(tagRepository.findTagByOwnerAndTagNameIgnoreCase(owner, "urgent")).thenReturn(existing);

        Tag created = tagService.createTag(owner, "urgent");

        assertSame(existing, created);
    }

    @Test
    void ensureTagsExistSkipsBlankEntriesAndCreatesMissingTags() {
        Tag existing = TestDataFactory.tag("tag-1", owner, "urgent");
        Tag incomingExisting = TestDataFactory.tag(null, null, " urgent ");
        Tag incomingNew = TestDataFactory.tag(null, null, "home");
        when(tagRepository.findTagByOwnerAndTagNameIgnoreCase(owner, "urgent")).thenReturn(existing);
        when(tagRepository.findTagByOwnerAndTagNameIgnoreCase(owner, "home")).thenReturn(null);
        when(tagRepository.save(any(Tag.class))).thenAnswer(invocation -> {
            Tag tag = invocation.getArgument(0);
            tag.setTagId("tag-2");
            return tag;
        });

        List<Tag> incomingTags = new ArrayList<>();
        incomingTags.add(incomingExisting);
        incomingTags.add(null);
        incomingTags.add(TestDataFactory.tag(null, null, "   "));
        incomingTags.add(incomingNew);

        List<Tag> resolved = tagService.ensureTagsExist(owner, incomingTags);

        assertEquals(2, resolved.size());
        assertSame(existing, resolved.get(0));
        assertEquals("home", resolved.get(1).getTagName());
    }

    @Test
    void createTagRejectsMissingOwner() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> tagService.createTag(null, "urgent"));

        assertEquals("Owner is required", exception.getMessage());
    }

    @Test
    void createTagRejectsBlankName() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> tagService.createTag(owner, "   "));

        assertEquals("Tag name is required", exception.getMessage());
    }
}
