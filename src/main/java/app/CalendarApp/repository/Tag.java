package app.CalendarApp.repository;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Document("Account")
public class Tag {
    @Id
    private String tagId;

    @DocumentReference(lazy = true)
    private Account owner;

    private String tagName;

    public Tag(String tagId, Account owner, String tagName)  {
        this.tagId = tagId;
        this.owner = owner;
        this.tagName = tagName;
    }

    public String getTagId() {
        return tagId;
    }

    public void setTagId(String tagId) {
        this.tagId = tagId;
    }

    public Account getOwner() {
        return owner;
    }

    public void setOwner(Account owner) {
        this.owner = owner;
    }

    public String getTagName() {
        return tagName;
    }

    public void setTagName(String tagName) {
        this.tagName = tagName;
    }
}
