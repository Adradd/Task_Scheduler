package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {
    private final AccountService accountService;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public AccountController(AccountService accountService, PasswordEncoder passwordEncoder) {
        this.accountService = accountService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/{accountId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Account> getAccountById(@PathVariable String accountId) {
        Account account = accountService.findAccountByAccountId(accountId);
        return account != null ? ResponseEntity.ok(account) : ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createAccount(@RequestBody Account account) {
        try {
            Account created = accountService.createAccount(account);
            Map<String, Object> response = new HashMap<>();
            response.put("accountId", created.getId());
            response.put("username", created.getUsername());
            response.put("email", created.getEmail());
            response.put("message", "Account created successfully");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");

        if (username == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username and password are required"));
        }

        Account account = accountService.findAccountByUsername(username);
        if (account == null || !passwordEncoder.matches(password, account.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid username or password"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("accountId", account.getId());
        response.put("username", account.getUsername());
        response.put("email", account.getEmail());
        response.put("role", account.getRole());
        response.put("message", "Login successful");
        return ResponseEntity.ok(response);
    }
}
