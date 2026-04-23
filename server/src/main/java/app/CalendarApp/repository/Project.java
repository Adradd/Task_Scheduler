package app.CalendarApp.repository;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Setter
@Getter
@Document("Project")
public class Project {
    @Id
    private String projectId;
    @DocumentReference(lazy = true)
    private Account owner;
    private String projectName;
    private String projectColor;

    public Project() {
    }

    public Project(String projectId, Account owner, String projectName, String projectColor) {
        this.projectId = projectId;
        this.owner = owner;
        this.projectName = projectName;
        this.projectColor = projectColor;
    }

}

