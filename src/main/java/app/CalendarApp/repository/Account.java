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

    public Account(String accountId, String username, String password, String email, String dateCreated) {
        this.accountId = accountId;
        this.username = username;
        this.password = password;
        this.email = email;
        this.dateCreated = dateCreated;
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
}
