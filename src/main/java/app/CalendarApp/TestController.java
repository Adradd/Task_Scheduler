package app.CalendarApp;

import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api")
public class TestController {
    @GetMapping("/get")
    public String home() {
        return "get";
    }
    @PostMapping("/post")
    public String postExample() {
        return "This is a POST request example.";
    }
}
