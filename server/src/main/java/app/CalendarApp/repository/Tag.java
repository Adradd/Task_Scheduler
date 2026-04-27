package app.CalendarApp.repository;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Document("Tag")
public class Tag {
    @Id
    private String tagId;

    @DocumentReference(lazy = true)
    private Account owner;

    private String tagName;
}
