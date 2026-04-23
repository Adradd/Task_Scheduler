package app.CalendarApp.repository;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Setter
@Getter
@Document("Tag")
public class Tag {
    @Id
    private String tagId;

    @DocumentReference(lazy = true)
    private Account owner;

    private String tagName;

    public Tag() {

    }

    public Tag(String tagId, Account owner, String tagName)  {
        this.tagId = tagId;
        this.owner = owner;
        this.tagName = tagName;
    }

}
