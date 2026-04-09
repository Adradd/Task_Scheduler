package app.CalendarApp.repository;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonSetter;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DocumentReference;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

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
    public String getTaskId() {
        return taskId;
    }
    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public Account getOwner() {
        return owner;
    }

    public void setOwner(Account owner) {
        this.owner = owner;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public LocalDate getDeadline() {
        return deadline;
    }

    public void setDeadline(LocalDate deadline) {
        this.deadline = deadline;
    }

    public String getTimeToComplete() {
        return timeToComplete;
    }

    public void setTimeToComplete(String timeToComplete) {
        this.timeToComplete = timeToComplete;
    }

    public Project getProject() {
        return project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public TaskPriority getPriority() {
        return priority;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public List<Tag> getTags() {
        return tags;
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
                return;
            }
            case Project parsedProject -> {
                this.project = parsedProject;
                return;
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
                return;
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

    public String getComments() {
        return comments;
    }
    public void setComments(String comments) {
        this.comments = comments;
    }
    public boolean isCompleted() {
        return isCompleted;
    }
    public void setIsCompleted(boolean completed) {
        isCompleted = completed;
    }
    public LocalDateTime getEndTime() {
        return endTime;
    }
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
    public LocalDateTime getStartTime() {
        return startTime;
    }
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public String getGoogleCalendarEventId() {
        return googleCalendarEventId;
    }

    public void setGoogleCalendarEventId(String googleCalendarEventId) {
        this.googleCalendarEventId = googleCalendarEventId;
    }

    public String getGoogleSourceCalendarId() {
        return googleSourceCalendarId;
    }

    public void setGoogleSourceCalendarId(String googleSourceCalendarId) {
        this.googleSourceCalendarId = googleSourceCalendarId;
    }

    public String getGoogleSourceEventId() {
        return googleSourceEventId;
    }

    public void setGoogleSourceEventId(String googleSourceEventId) {
        this.googleSourceEventId = googleSourceEventId;
    }

    public boolean isImportedFromGoogle() {
        return importedFromGoogle;
    }

    public void setImportedFromGoogle(boolean importedFromGoogle) {
        this.importedFromGoogle = importedFromGoogle;
    }

    public boolean isAutoSchedule() {
        return autoSchedule;
    }

    public void setAutoSchedule(boolean autoSchedule) {
        this.autoSchedule = autoSchedule;
    }
}
