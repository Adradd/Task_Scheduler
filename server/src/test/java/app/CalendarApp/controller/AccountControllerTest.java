package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccountController.class)
@AutoConfigureMockMvc(addFilters = false)
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountService accountService;

    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Test
    void createAccountReturnsExpectedPayload() throws Exception {
        Account created = TestDataFactory.account("acc-1", "jane");
        created.setDateCreated("2026-04-08");
        when(accountService.createAccount(any(Account.class))).thenReturn(created);

        mockMvc.perform(post("/api/accounts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"jane","password":"password123","email":"jane@example.com"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accountId").value("acc-1"))
            .andExpect(jsonPath("$.username").value("jane"))
            .andExpect(jsonPath("$.dateCreated").value("2026-04-08"))
            .andExpect(jsonPath("$.message").value("Account created successfully"));
    }

    @Test
    void loginReturnsSuccessForValidCredentials() throws Exception {
        Account account = TestDataFactory.account("acc-1", "jane");
        account.setPassword("encoded");
        when(accountService.findAccountByUsername("jane")).thenReturn(account);
        when(passwordEncoder.matches("password123", "encoded")).thenReturn(true);

        mockMvc.perform(post("/api/accounts/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"jane","password":"password123"}
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accountId").value("acc-1"))
            .andExpect(jsonPath("$.message").value("Login successful"));
    }

    @Test
    void loginReturnsBadRequestForMissingCredentials() throws Exception {
        mockMvc.perform(post("/api/accounts/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"jane"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Username and password are required"));
    }

    @Test
    void loginReturnsBadRequestForInvalidCredentials() throws Exception {
        Account account = TestDataFactory.account("acc-1", "jane");
        account.setPassword("encoded");
        when(accountService.findAccountByUsername("jane")).thenReturn(account);
        when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);

        mockMvc.perform(post("/api/accounts/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username":"jane","password":"wrong"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid username or password"));
    }

    @Test
    void updateAccountChangesAllowedFields() throws Exception {
        Account existing = TestDataFactory.account("acc-1", "jane");
        Account updated = TestDataFactory.account("acc-1", "janedoe");
        updated.setEmail("janedoe@example.com");
        updated.setStartWorkingHours("08:00");
        updated.setEndWorkingHours("16:00");
        when(accountService.findAccountByAccountId("acc-1")).thenReturn(existing);
        when(accountService.updateAccount(any(Account.class))).thenReturn(updated);

        mockMvc.perform(put("/api/accounts/acc-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "username":"janedoe",
                      "email":"janedoe@example.com",
                      "startWorkingHours":"08:00",
                      "endWorkingHours":"16:00",
                      "password":"should-not-overwrite"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.username").value("janedoe"))
            .andExpect(jsonPath("$.email").value("janedoe@example.com"))
            .andExpect(jsonPath("$.startWorkingHours").value("08:00"));
    }

    @Test
    void updateAccountReturnsBadRequestForInvalidWorkingHourFormat() throws Exception {
        Account existing = TestDataFactory.account("acc-1", "jane");
        when(accountService.findAccountByAccountId("acc-1")).thenReturn(existing);
        when(accountService.updateAccount(any(Account.class))).thenThrow(new IllegalArgumentException("Invalid working hour format"));

        mockMvc.perform(put("/api/accounts/acc-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"startWorkingHours":"8am"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid working hour format"));
    }

    @Test
    void updateAccountReturnsNotFoundWhenMissing() throws Exception {
        mockMvc.perform(put("/api/accounts/missing")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"jane\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    void updateAccountReturnsBadRequestOnValidationError() throws Exception {
        Account existing = TestDataFactory.account("acc-1", "jane");
        when(accountService.findAccountByAccountId("acc-1")).thenReturn(existing);
        when(accountService.updateAccount(any(Account.class))).thenThrow(new IllegalArgumentException("Invalid email format"));

        mockMvc.perform(put("/api/accounts/acc-1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"bad\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Invalid email format"));
    }
}
