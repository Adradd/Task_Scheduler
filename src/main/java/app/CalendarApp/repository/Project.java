package app.CalendarApp.repository;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

@Document("Project")
public class Project {
    @Id
    private String projectId;

    @DocumentReference(lazy = true)
    private Account owner;

    private String projectName;

    public Project() {
    }

    public Project(String projectId, Account owner, String projectName) {
        this.projectId = projectId;
        this.owner = owner;
        this.projectName = projectName;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public Account getOwner() {
        return owner;
    }

    public void setOwner(Account owner) {
        this.owner = owner;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }
}

