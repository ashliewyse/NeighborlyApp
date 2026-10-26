import React from 'react';
import {MemoryRouter} from 'react-router';
import {WelcomePage} from '../../src/app/components/WelcomePage';
import {InstallAppProvider,InstallAppPage} from '../../src/app/components/InstallApp';
export function InstallationWelcome(){return <MemoryRouter><InstallAppProvider><InstallAppPage/></InstallAppProvider></MemoryRouter>;}
export function RegistrationWelcome(){return <MemoryRouter><WelcomePage/></MemoryRouter>;}
