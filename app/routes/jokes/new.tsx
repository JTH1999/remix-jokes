import {
    ActionArgs,
    json,
    LinksFunction,
    LoaderArgs,
    redirect,
} from "@remix-run/node";
import {
    Outlet,
    Link,
    useLoaderData,
    useActionData,
    useCatch,
    Form,
} from "@remix-run/react";
import { useState } from "react";

import stylesUrl from "~/styles/jokes.css";
import { db } from "~/utils/db.server";
import { badRequest } from "~/utils/request.server";
import { getUserId, requireUserId } from "~/utils/session.server";

export const loader = async ({ request }: LoaderArgs) => {
    const userId = await getUserId(request);
    if (!userId) {
        throw new Response("Unauthorized", { status: 401 });
    }
    return json({});
};

function validateJokeContent(content: string) {
    if (content.length < 10) {
        return "Content too short";
    }
}

function validateJokeName(name: string) {
    if (name.length < 3) {
        return "Name too short";
    }
}

export async function action({ request }: ActionArgs) {
    const userId = await requireUserId(request);
    const form = await request.formData();
    const name = form.get("name");
    const content = form.get("content");
    // we do this type check to be extra sure and to make TypeScript happy
    // we'll explore validation next!
    if (typeof name !== "string" || typeof content !== "string") {
        return badRequest({
            fieldErrors: null,
            fields: null,
            formError: "Form not submitted correctly",
        });
    }

    const fieldErrors = {
        name: validateJokeName(name),
        content: validateJokeContent(content),
    };

    const fields = { name, content };
    if (Object.values(fieldErrors).some(Boolean)) {
        return badRequest({
            fieldErrors,
            fields,
            formError: null,
        });
    }

    const joke = await db.joke.create({
        data: { ...fields, jokesterId: userId },
    });
    return redirect(`/jokes/${joke.id}`);
}

export default function NewJokeRoute() {
    const actionData = useActionData<typeof action>();
    const [nameError, setNameError] = useState(actionData?.fieldErrors?.name);
    const [contentError, setContentError] = useState(
        actionData?.fieldErrors?.content
    );
    function nameChange(event: { target: { value: string } }) {
        if (actionData) {
            setNameError(
                validateJokeName(event.target.value)
                    ? validateJokeName(event.target.value)
                    : ""
            );
        } else {
            return;
        }
    }

    function contentChange(event: { target: { value: string } }) {
        if (actionData) {
            setContentError(
                validateJokeContent(event.target.value)
                    ? validateJokeContent(event.target.value)
                    : ""
            );
        } else {
            return;
        }
    }

    return (
        <div>
            <p>Add your own hilarious joke</p>
            <Form method="post">
                <div>
                    <label>
                        Name:{" "}
                        <input
                            type="text"
                            defaultValue={actionData?.fields?.name}
                            name="name"
                            // sets aria invalid property if there is a name field error
                            aria-invalid={Boolean(nameError) || undefined}
                            aria-errormessage={
                                nameError != "" ? "name-error" : undefined
                            }
                            onChange={nameChange}
                        />
                    </label>
                    {nameError != "" ? (
                        <p
                            className="form-validation-error"
                            role="alert"
                            id="name-error"
                        >
                            {nameError}
                        </p>
                    ) : null}
                </div>
                <div>
                    <label>
                        Content:{" "}
                        <textarea
                            name="content"
                            defaultValue={actionData?.fields?.content}
                            aria-invalid={Boolean(contentError) || undefined}
                            aria-errormessage={
                                contentError != "" ? "content-error" : undefined
                            }
                            onChange={contentChange}
                        />
                    </label>
                    {contentError != "" ? (
                        <p
                            className="form-validation-error"
                            role="alert"
                            id="content-error"
                        >
                            {contentError}
                        </p>
                    ) : null}
                </div>
                <div>
                    <button type="submit" className="button">
                        Add
                    </button>
                </div>
            </Form>
        </div>
    );
}

export function CatchBoundary() {
    const caught = useCatch();

    if (caught.status === 401) {
        return (
            <div className="error-container">
                <p>You must be logged in to create a joke.</p>
                <Link to="/login">Login</Link>
            </div>
        );
    }
}

export function ErrorBoundary() {
    return (
        <div className="error-container">
            Something unexpected went wrong. Sorry about that.
        </div>
    );
}
