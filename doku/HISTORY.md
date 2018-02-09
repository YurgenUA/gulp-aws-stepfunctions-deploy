__Version 0.2.0__
- StepFunction deploy improvement. Updating (see UpdateStateMachine(...)) if user does not force recreation (see 'recreate' flag)


__Version 0.1.1__
- Test Function json file improvements. Treating "function_name", "role_arn", "function_body" with ES6 template string mechanism (see http://es6-features.org/#StringInterpolation)

__Version 0.1.0__
- Breaking change! Now supporting multiple Test Functions deployment (all params moved from gulp tasks to json file)
- extened Test Function json file to have all specific params (function nema, role arn, recreate etc.)
- fixed AWS error swallowing (now errors go to console and visible for user)
- added couple Step Functions sample files

__Version 0.0.3__
- added placeholders for unit-tests
- added integration with Travis
- started to use package in my project

__Version 0.0.2__
- added error message when step_functions json file is not found
- added history
- removed not needed 'event-stream' 

__Version 0.0.1__
- initial version