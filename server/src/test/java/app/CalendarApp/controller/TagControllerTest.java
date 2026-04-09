package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.TagService;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TagController.class)
@AutoConfigureMockMvc(addFilters = false)
class TagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TagService tagService;

    @MockitoBean
    private AccountService accountService;

    private Account owner;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
    }

    @Test
    void getTagsReturnsUserTags() throws Exception {
        Tag tag = TestDataFactory.tag("tag-1", owner, "urgent");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(tagService.findAllByOwner(owner)).thenReturn(List.of(tag));

        mockMvc.perform(get("/api/tags").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].tagName").value("urgent"));
    }

    @Test
    void createTagReturnsBadRequestOnValidationError() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(tagService.createTag(owner, "urgent")).thenThrow(new IllegalArgumentException("Tag name is required"));

        mockMvc.perform(post("/api/tags")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagName\":\"urgent\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Tag name is required"));
    }

    @Test
    void unresolvedAccountReturnsNotFound() throws Exception {
        mockMvc.perform(post("/api/tags")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tagName\":\"urgent\"}"))
            .andExpect(status().isNotFound());
    }
}
