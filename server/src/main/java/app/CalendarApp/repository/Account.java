package app.CalendarApp.repository;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Setter
@Getter
@Document("Account")
public class Account {
    @Id
    private String accountId;
    private String username;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    private String email;
    private String dateCreated;
    private String role;
    private String startWorkingHours;
    private String endWorkingHours;
    @JsonIgnore
    private String googleRefreshToken;
    @JsonIgnore
    private String googleAccessToken;
    @JsonIgnore
    private String googleAccessTokenExpiresAt;

    public Account() {
        this.role = "user";
    }

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
}
