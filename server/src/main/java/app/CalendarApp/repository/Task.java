package app.CalendarApp.repository;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonSetter;
import lombok.Getter;
import lombok.NoArgsConstructor;
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

/**
 * MongoDB document representing a task, including scheduling metadata,
 * project/tag references, completion state, and Google Calendar linkage.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@Setter
@Getter
@NoArgsConstructor
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

    /**
     * Creates a task with the core user-editable fields and marks it incomplete.
     *
     * @param taskId unique task identifier
     * @param owner account that owns the task
     * @param taskName display name
     * @param deadline date by which the task should be finished
     * @param timeToComplete estimated duration string
     * @param priority task priority
     * @param project optional project reference
     * @param tags optional tag references
     * @param comments free-form task notes
     * @param startTime optional scheduled start time
     */
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

    /**
     * Replaces tags defensively so callers cannot mutate the internal list.
     *
     * @param tags tag list to assign, or null for an empty list
     */
    public void setTags(List<Tag> tags) {
        this.tags = (tags != null) ? new ArrayList<>(tags) : new ArrayList<>();
    }

    /**
     * Deserializes tag payloads sent either as tag objects or maps.
     *
     * @param tags raw JSON value for the tags property
     */
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

    /**
     * Deserializes project payloads sent as a project object, map, string name,
     * or null value.
     *
     * @param project raw JSON value for the project property
     */
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

    /**
     * Updates the completed flag while preserving the JavaBean boolean naming
     * used by the existing API.
     *
     * @param completed whether the task is completed
     */
    public void setIsCompleted(boolean completed) {
        isCompleted = completed;
    }
}
