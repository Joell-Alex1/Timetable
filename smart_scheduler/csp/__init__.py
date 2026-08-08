"""
csp/ package — generic CSP engine.

Provides the CSP model (variables, domains, constraint graph),
backtracking solver, and heuristics (MRV, Degree, LCV, Forward Checking).
"""

from csp.model import Session, Value, CSPModel

__all__ = ["Session", "Value", "CSPModel"]
