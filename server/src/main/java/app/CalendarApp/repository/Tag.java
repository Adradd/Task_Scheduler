package app.CalendarApp.repository;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

/**
 * MongoDB document representing a user-owned tag that can be assigned to tasks.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
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
