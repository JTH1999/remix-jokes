import {
    ActionArgs,
    json,
    LinksFunction,
    LoaderArgs,
    redirect,
} from "@remix-run/node";
import { Form, Link, useActionData, useSearchParams } from "@remix-run/react";
import { useState } from "react";

import stylesUrl from "~/styles/login.css";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { createUserSession, login, register } from "~/utils/session.server";

export const links: LinksFunction = () => [
    { rel: "stylesheet", href: stylesUrl },
];

function validateUsername(username: string) {
    if (username.length < 3) {
        return "Username must be at least 3 characters";
    }
}

function validatePassword(password: string) {
    if (password.length < 6) {
        return "Password must be at least 6 characters";
    }
}

function validateUrl(url: string) {
    let urls = ["/jokes", "/", "https://remix.run"];
    if (urls.includes(url)) {
        return url;
    }

    return "/jokes";
}

export async function action({ request }: ActionArgs) {
    const form = await request.formData();
    const loginType = form.get("loginType");
    const username = form.get("username");
    const password = form.get("password");
    const redirectTo = validateUrl(
        form.get("redirectTo")?.toString() || "/jokes"
    );

    if (
        typeof username !== "string" ||
        typeof password !== "string" ||
        typeof loginType !== "string" ||
        typeof redirectTo !== "string"
    ) {
        return badRequest({
            fieldErrors: null,
            fields: null,
            formError: "Form not submitted correctly",
        });
    }

    const fieldErrors = {
        username: validateUsername(username),
        password: validatePassword(password),
    };

    const fields = { username, password };
    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({
            fieldErrors,
            fields,
            formError: null,
        });
    }

    if (loginType == "login") {
        const user = await login({ username, password });
        console.log(user);
        if (!user) {
            return badRequest({
                fieldErrors: null,
                fields: null,
                formError: "Username or password incorrect",
            });
        }

        return createUserSession(user.id, redirectTo);
    } else if (loginType == "register") {
        const userExists = await db.user.findFirst({
            where: { username },
        });

        if (userExists) {
            return badRequest({
                fieldErrors: null,
                fields: null,
                formError: `User with username ${username} already exists`,
            });
        }

        const user = await register({ username, password });
        if (!user) {
            return badRequest({
                fieldErrors: null,
                fields: null,
                formError: `Something went wrong trying to create a new user.`,
            });
        }

        return createUserSession(user.id, redirectTo);
    }
}

export default function Login() {
    const [searchParams] = useSearchParams();

    const actionData = useActionData<typeof action>();
    const [usernameError, setUsernameError] = useState(
        actionData?.fieldErrors?.username
    );
    const [passwordError, setPasswordError] = useState(
        actionData?.fieldErrors?.password
    );

    function handleUsernameChange(event: { target: { value: string } }) {
        if (actionData) {
            setUsernameError(
                validateUsername(event.target.value)
                    ? validateUsername(event.target.value)
                    : ""
            );
        } else {
            return;
        }
    }

    function handlePasswordChange(event: { target: { value: string } }) {
        if (actionData) {
            setPasswordError(
                validatePassword(event.target.value)
                    ? validatePassword(event.target.value)
                    : ""
            );
        } else {
            return;
        }
    }

    return (
        <div className="container">
            <div className="content" data-light="">
                <h1>Login</h1>
                <Form method="post">
                    <input
                        type="hidden"
                        name="redirectTo"
                        value={searchParams.get("redirectTo") ?? undefined}
                    />
                    <fieldset>
                        <legend className="sr-only">Login or Register?</legend>
                        <label>
                            <input
                                type="radio"
                                name="loginType"
                                value="login"
                                defaultChecked
                            />{" "}
                            Login
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="loginType"
                                value="register"
                            />{" "}
                            Register
                        </label>
                    </fieldset>
                    <div>
                        <label htmlFor="username-input">Username</label>
                        <input
                            type="text"
                            id="username-input"
                            name="username"
                            defaultValue={actionData?.fields?.username}
                            aria-invalid={Boolean(usernameError) || undefined}
                            aria-errormessage={
                                usernameError != ""
                                    ? "username-error"
                                    : undefined
                            }
                            onChange={handleUsernameChange}
                        />
                        {usernameError != "" ? (
                            <p
                                className="form-validation-error"
                                role="alert"
                                id="username-error"
                            >
                                {usernameError}
                            </p>
                        ) : null}
                    </div>
                    <div>
                        <label htmlFor="password-input">Password</label>
                        <input
                            id="password-input"
                            name="password"
                            type="password"
                            aria-invalid={Boolean(passwordError) || undefined}
                            aria-errormessage={
                                passwordError != ""
                                    ? "password-error"
                                    : undefined
                            }
                            onChange={handlePasswordChange}
                        />
                        {passwordError != "" ? (
                            <p
                                className="form-validation-error"
                                role="alert"
                                id="password-error"
                            >
                                {passwordError}
                            </p>
                        ) : null}
                    </div>
                    <button type="submit" className="button">
                        Submit
                    </button>
                </Form>
            </div>
            <div className="links">
                <ul>
                    <li>
                        <Link to="/">Home</Link>
                    </li>
                    <li>
                        <Link to="/jokes">Jokes</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
}
