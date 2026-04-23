package app.CalendarApp.repository;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Setter
@Getter
@Document("Task")
public class Task {
    @Id
    private String taskId;

    @DocumentReference(lazy = true)
    private Account owner;

    private String taskName;
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;
    private String timeToComplete;
    private TaskPriority priority;
    @DocumentReference(lazy = true)
    private Project project;
    @DocumentReference(lazy = true)
    private List<Tag> tags = new ArrayList<>();
    private String comments;
    private boolean isCompleted;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime startTime;
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime endTime;
    private String googleCalendarEventId;
    private String googleSourceCalendarId;
    private String googleSourceEventId;
    private boolean importedFromGoogle;
    @Transient
    private boolean autoSchedule;

    public Task() {
        // Required by persistence/deserialization frameworks.
    }

    public Task(String taskId, Account owner, String taskName, LocalDate deadline, String timeToComplete, TaskPriority priority, Project project, List<Tag> tags, String comments, LocalDateTime startTime) {
        this.taskId = taskId;
        this.owner = owner;
        this.taskName = taskName;
        this.deadline = deadline;
        this.timeToComplete = timeToComplete;
        this.priority = priority;
        this.project = project;
        this.tags = (tags != null) ? new ArrayList<>(tags) : new ArrayList<>();
        this.comments = comments;
        this.isCompleted = false;
        this.startTime = startTime;
    }

    public void setTags(List<Tag> tags) {
        this.tags = (tags != null) ? new ArrayList<>(tags) : new ArrayList<>();
    }

    @JsonSetter("tags")
    public void setTagsFromJson(Object tags) {
        if (tags == null) {
            this.tags = new ArrayList<>();
            return;
        }

        if (tags instanceof Collection<?> collection) {
            List<Tag> tagList = new ArrayList<>();
            for (Object value : collection) {
                if (value instanceof java.util.Map<?, ?> tagMap) {
                    Tag tag = new Tag();
                    if (tagMap.containsKey("tagId")) {
                        tag.setTagId(String.valueOf(tagMap.get("tagId")));
                    }
                    if (tagMap.containsKey("tagName")) {
                        tag.setTagName(String.valueOf(tagMap.get("tagName")));
                    }
                    tagList.add(tag);
                } else if (value instanceof Tag tag) {
                    tagList.add(tag);
                }
            }
            this.tags = tagList;
        }
    }

    @JsonSetter("project")
    public void setProjectFromJson(Object project) {
        switch (project) {
            case null -> {
                this.project = null;
            }
            case Project parsedProject -> {
                this.project = parsedProject;
            }
            case java.util.Map<?, ?> projectMap -> {
                Project parsedProject = new Project();
                if (projectMap.containsKey("projectId")) {
                    parsedProject.setProjectId(String.valueOf(projectMap.get("projectId")));
                }
                if (projectMap.containsKey("projectName")) {
                    parsedProject.setProjectName(String.valueOf(projectMap.get("projectName")));
                }
                if (projectMap.containsKey("projectColor")) {
                    parsedProject.setProjectColor(String.valueOf(projectMap.get("projectColor")));
                }
                this.project = parsedProject;
            }
            case String projectName when !projectName.trim().isEmpty() -> {
                Project parsedProject = new Project();
                parsedProject.setProjectName(projectName.trim());
                this.project = parsedProject;
            }
            default -> {
            }
        }

    }

    public void setIsCompleted(boolean completed) {
        isCompleted = completed;
    }
}
