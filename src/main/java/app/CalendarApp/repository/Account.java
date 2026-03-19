package app.CalendarApp.repository;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;


@Document("Account")
public class Account {
    @Id
    private String accountId;
    private String username;
    private String password;
    private String email;
    private String dateCreated;
    private String role;
    private String startWorkingHours;
    private String endWorkingHours;

    public Account(String accountId, String username, String password, String email,
                   String dateCreated, String startWorkingHours, String endWorkingHours) {
        this.accountId = accountId;
        this.username = username;
        this.password = password;
        this.email = email;
        this.dateCreated = dateCreated;
        this.role = "user";
        this.startWorkingHours = startWorkingHours;
        this.endWorkingHours = endWorkingHours;
    }

    public String getId() {
        return accountId;
    }
    public void setId(String accountId) {
        this.accountId = accountId;
    }
    public String getUsername() {
        return username;
    }
    public void setUsername(String username) {
        this.username = username;
    }
    public String getPassword() {
        return password;
    }
    public void setPassword(String password) {
        this.password = password;
    }
    public String getEmail() {
        return email;
    }
    public void setEmail(String email) {
        this.email = email;
    }
    public String getDateCreated() {
        return dateCreated;
    }
    public void setDateCreated(String dateCreated) {
        this.dateCreated = dateCreated;
    }
    public String getRole() {
        return role;
    }
    public void setRole(String role) {
        this.role = role;
    }
    public String getStartWorkingHours() {
        return startWorkingHours;
    }
    public void setStartWorkingHours(String startWorkingHours) {
        this.startWorkingHours = startWorkingHours;
    }
    public String getEndWorkingHours() {
        return endWorkingHours;
    }
    public void setEndWorkingHours(String endWorkingHours) {
        this.endWorkingHours = endWorkingHours;
    }
}
