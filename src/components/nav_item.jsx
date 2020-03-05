import React from 'react';
import { Link } from 'react-router-dom';

import '../style/nav_item.css';

const NavItem = (props) => {
  const { pathname } = window.location;
  const { to } = props;

  // The link should be styled as active if the current url is equal to the link url
  const className = pathname === to ? 'active' : '';

  return (
    // Return the Link, its activeness or inactiveness reflected
    <li className={className}>
      <Link {...props} />
    </li>
  );
};

export default NavItem;
