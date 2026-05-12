# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: test_push.spec.ts >> verify push notification fires
- Location: test_push.spec.ts:3:1

# Error details

```
Error: page.evaluate: TypeError: Failed to execute 'showNotification' on 'ServiceWorkerRegistration': No notification permission has been granted for this origin.
    at eval (eval at evaluate (:302:30), <anonymous>:3:15)
    at async <anonymous>:328:30
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - heading "KL CommuteMind" [level=1] [ref=e5]
    - paragraph [ref=e6]: Intelligent Transit Optimizer for Greater KL
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "Should I Leave Now?" [level=2] [ref=e10]
        - generic [ref=e11]: LEAVE EARLY
        - paragraph [ref=e12]: LRT KJ Line is experiencing a 15 min delay due to bunching. Leave 15 mins early.
      - img [ref=e14]
    - generic [ref=e16]:
      - text: KJ10
      - img [ref=e17]
      - text: KG18A
  - generic [ref=e19]:
    - generic [ref=e20]:
      - generic [ref=e21]:
        - heading "Plan Your Journey" [level=2] [ref=e22]
        - generic [ref=e23]:
          - textbox "e.g. nak pergi Midvalley dari Chow Kit elak LRT" [ref=e24]
          - img [ref=e25]
          - button "Search Commute" [ref=e28]
      - generic [ref=e29]:
        - heading "Recent Disruptions" [level=3] [ref=e30]:
          - img [ref=e31]
          - text: Recent Disruptions
        - list [ref=e34]:
          - listitem [ref=e35]:
            - generic [ref=e36]: KJ Line (Pasar Seni)
            - generic [ref=e37]: 15m Delay
          - listitem [ref=e38]:
            - generic [ref=e39]: MRT Kajang
            - generic [ref=e40]: Normal
    - generic [ref=e43]:
      - region "Map" [ref=e44]
      - group [ref=e45]:
        - generic "Toggle attribution" [ref=e46] [cursor=pointer]
        - link "MapLibre" [ref=e48] [cursor=pointer]:
          - /url: https://maplibre.org/
```